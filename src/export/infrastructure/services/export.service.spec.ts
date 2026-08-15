import ky from 'ky';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { FakeExportRepository } from '../../__fixtures__/fake-export.repository';
import { ExportType } from '../../domain/entities/export.entity';
import { Primitive } from '../../domain/services/export.service';
import { CsvService } from './csv.service';
import { ExportService } from './export.service';

jest.mock('ky', () => ({
  __esModule: true,
  default: { put: jest.fn().mockResolvedValue(undefined) },
}));

const put = ky.put as jest.Mock;

const OBJECT_NAME = 'exports/2026/report.csv';
const SIGNED_URL = 'https://filehub.example/put/report.csv?sig=abc';

async function* chunksOf(
  ...chunks: Array<{ [key: string]: Primitive }[]>
): AsyncGenerator<{ [key: string]: Primitive }[]> {
  for (const chunk of chunks) yield chunk;
}

function build() {
  const exports = new FakeExportRepository();

  const fileHub = stubRepository<FileHubService>('FileHubService', {
    getSignedPutUrl: async () => ({
      signedUrl: SIGNED_URL,
      filename: OBJECT_NAME,
      expirationDate: new Date('2026-01-01T00:00:00.000Z'),
    }),
  });

  // The real CsvService, not a stand-in: the chunked path depends on the exact shape of
  // csv-stringify's output — header placement and the trailing newline — so substituting
  // it would test the wrong thing.
  return {
    exports,
    service: new ExportService(new CsvService(), exports, fileHub),
  };
}

/** The CSV body handed to the signed PUT. */
const uploadedBody = () => put.mock.calls[0][1].body as string;

describe('ExportService', () => {
  beforeEach(() => {
    put.mockClear();
  });

  describe('export', () => {
    it('uploads the rendered csv to the signed url', async () => {
      const { service } = build();

      await service.export([{ name: 'Dana', role: 'agent' }]);

      expect(put).toHaveBeenCalledTimes(1);
      expect(put.mock.calls[0][0]).toBe(SIGNED_URL);
      expect(uploadedBody()).toBe('name,role\nDana,agent\n');
    });

    it('declares a utf-8 csv content type', async () => {
      const { service } = build();

      await service.export([{ a: 1 }]);

      expect(put.mock.calls[0][1].headers).toEqual({
        'Content-Type': 'text/csv; charset=utf-8',
      });
    });

    it('persists an export row describing the upload', async () => {
      const { service, exports } = build();

      const result = await service.export([{ a: 1 }, { a: 2 }]);

      expect(exports.saved).toEqual([result]);
      expect(result.type).toBe(ExportType.CSV);
      expect(result.objectPath).toBe(OBJECT_NAME);
      expect(result.rows).toBe(2);
    });

    /** Size is byte length, not character count — it is what the object store received. */
    it('records the byte size of the payload', async () => {
      const { service } = build();

      const result = await service.export([{ note: 'café' }]);

      expect(result.size).toBe(Buffer.byteLength(uploadedBody()));
      expect(result.size).toBeGreaterThan(uploadedBody().length);
    });

    it('uploads an empty body for no rows', async () => {
      const { service } = build();

      const result = await service.export([]);

      expect(uploadedBody()).toBe('');
      expect(result.rows).toBe(0);
      expect(result.size).toBe(0);
    });

    it('does not persist an export when the upload fails', async () => {
      const { service, exports } = build();
      put.mockRejectedValueOnce(new Error('object store unreachable'));

      await expect(service.export([{ a: 1 }])).rejects.toThrow(
        'object store unreachable',
      );

      expect(exports.saved).toHaveLength(0);
    });
  });

  describe('exportFromAsyncGenerator', () => {
    it('emits the header once and appends every later chunk', async () => {
      const { service } = build();

      await service.exportFromAsyncGenerator(
        chunksOf([{ a: 1 }, { a: 2 }], [{ a: 3 }], [{ a: 4 }]),
      );

      expect(uploadedBody()).toBe('a\n1\n2\n3\n4\n');
    });

    it('counts rows across all chunks', async () => {
      const { service } = build();

      const result = await service.exportFromAsyncGenerator(
        chunksOf([{ a: 1 }, { a: 2 }], [{ a: 3 }]),
      );

      expect(result.rows).toBe(3);
    });

    it('handles a single chunk exactly like the direct path', async () => {
      const { service } = build();

      await service.exportFromAsyncGenerator(chunksOf([{ a: 1 }]));

      expect(uploadedBody()).toBe('a\n1\n');
    });

    it('uploads an empty body when the generator yields nothing', async () => {
      const { service } = build();

      const result = await service.exportFromAsyncGenerator(chunksOf());

      expect(uploadedBody()).toBe('');
      expect(result.rows).toBe(0);
    });

    it('skips empty chunks in the middle without losing rows', async () => {
      const { service } = build();

      const result = await service.exportFromAsyncGenerator(
        chunksOf([{ a: 1 }], [], [{ a: 2 }]),
      );

      expect(uploadedBody()).toBe('a\n1\n2\n');
      expect(result.rows).toBe(2);
    });

    it('escapes values consistently across chunk boundaries', async () => {
      const { service } = build();

      await service.exportFromAsyncGenerator(
        chunksOf([{ note: 'a,b' }], [{ note: 'say "hi"' }]),
      );

      expect(uploadedBody()).toBe('note\n"a,b"\n"say ""hi"""\n');
    });

    /**
     * Regression guard. An empty chunk used to consume the "first chunk" slot without
     * writing anything, so every later chunk had its header stripped as a duplicate and
     * the document came out headerless — the first data row became the column names on
     * parse. Reachable whenever a paginated query's first page is empty.
     */
    it('keeps the header when the first chunk is empty', async () => {
      const { service } = build();

      const result = await service.exportFromAsyncGenerator(
        chunksOf([], [{ a: 1 }, { a: 2 }]),
      );

      expect(uploadedBody()).toBe('a\n1\n2\n');
      expect(result.rows).toBe(2);
    });

    it('keeps the header when several leading chunks are empty', async () => {
      const { service } = build();

      await service.exportFromAsyncGenerator(chunksOf([], [], [{ a: 1 }]));

      expect(uploadedBody()).toBe('a\n1\n');
    });

    it('still counts rows from every chunk that had them', async () => {
      const { service } = build();

      const result = await service.exportFromAsyncGenerator(
        chunksOf([], [{ a: 1 }], [], [{ a: 2 }, { a: 3 }]),
      );

      expect(uploadedBody()).toBe('a\n1\n2\n3\n');
      expect(result.rows).toBe(3);
    });

    it('persists one export row for the whole stream', async () => {
      const { service, exports } = build();

      const result = await service.exportFromAsyncGenerator(
        chunksOf([{ a: 1 }], [{ a: 2 }]),
      );

      expect(exports.saved).toEqual([result]);
      expect(put).toHaveBeenCalledTimes(1);
    });

    it('does not persist an export when the upload fails', async () => {
      const { service, exports } = build();
      put.mockRejectedValueOnce(new Error('object store unreachable'));

      await expect(
        service.exportFromAsyncGenerator(chunksOf([{ a: 1 }])),
      ).rejects.toThrow('object store unreachable');

      expect(exports.saved).toHaveLength(0);
    });
  });
});
