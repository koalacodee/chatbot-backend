import { CsvService } from './csv.service';

/**
 * Exercises the real csv-parse / csv-stringify wiring rather than a stand-in, because the
 * value of this class is entirely in the options it passes — `columns: true`,
 * `skip_empty_lines: true` and `header: true` are the behaviour, and a fake would just
 * restate them.
 */
describe('CsvService', () => {
  let csv: CsvService;

  beforeEach(() => {
    csv = new CsvService();
  });

  describe('stringify', () => {
    it('writes a header row from the object keys', async () => {
      const output = await csv.stringify([{ name: 'Dana', role: 'agent' }]);

      expect(output).toBe('name,role\nDana,agent\n');
    });

    it('keeps column order stable across rows', async () => {
      const output = await csv.stringify([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ]);

      expect(output).toBe('a,b\n1,2\n3,4\n');
    });

    it('returns an empty string for no rows', async () => {
      await expect(csv.stringify([])).resolves.toBe('');
    });

    it('returns an empty string for null or undefined input', async () => {
      await expect(csv.stringify(null as any)).resolves.toBe('');
      await expect(csv.stringify(undefined as any)).resolves.toBe('');
    });

    describe('escaping', () => {
      it('quotes values containing the delimiter', async () => {
        const output = await csv.stringify([{ note: 'a,b' }]);

        expect(output).toBe('note\n"a,b"\n');
      });

      it('quotes and doubles embedded quotes', async () => {
        const output = await csv.stringify([{ note: 'say "hi"' }]);

        expect(output).toBe('note\n"say ""hi"""\n');
      });

      it('quotes values containing newlines', async () => {
        const output = await csv.stringify([{ note: 'line1\nline2' }]);

        expect(output).toBe('note\n"line1\nline2"\n');
      });
    });

    it('renders null and undefined as empty fields', async () => {
      const output = await csv.stringify([{ a: null, b: undefined, c: 'x' }]);

      expect(output).toBe('a,b,c\n,,x\n');
    });

    it('renders booleans and numbers without quoting', async () => {
      const output = await csv.stringify([{ flag: true, count: 0 }]);

      expect(output).toBe('flag,count\n1,0\n');
    });

    /** Every row is emitted with a trailing newline, which the chunked export relies on. */
    it('terminates the final row with a newline', async () => {
      const output = await csv.stringify([{ a: 1 }]);

      expect(output.endsWith('\n')).toBe(true);
    });
  });

  describe('parse', () => {
    it('reads the first line as column names', async () => {
      await expect(csv.parse('name,role\nDana,agent\n')).resolves.toEqual([
        { name: 'Dana', role: 'agent' },
      ]);
    });

    it('returns an empty array for a header-only document', async () => {
      await expect(csv.parse('name,role\n')).resolves.toEqual([]);
    });

    it('skips blank lines', async () => {
      await expect(csv.parse('a\n1\n\n2\n')).resolves.toEqual([
        { a: '1' },
        { a: '2' },
      ]);
    });

    it('unescapes quoted fields', async () => {
      await expect(csv.parse('note\n"a,b"\n')).resolves.toEqual([
        { note: 'a,b' },
      ]);
    });

    /**
     * Values stay strings. Casting was removed because CSV carries no types and inference
     * corrupts anything that merely looks numeric — the formatting below is exactly what a
     * leading-zero id or a version string would have lost.
     */
    it('leaves values as strings rather than inferring types', async () => {
      const [row] = await csv.parse('id,label\n42,x\n');

      expect(row.id).toBe('42');
      expect(typeof row.id).toBe('string');
    });

    it('preserves formatting that type inference would destroy', async () => {
      const [row] = await csv.parse(
        'employeeId,phone,version\n007,+441234567890,1.10\n',
      );

      expect(row).toEqual({
        employeeId: '007',
        phone: '+441234567890',
        version: '1.10',
      });
    });

    it('rejects malformed input rather than returning partial rows', async () => {
      await expect(csv.parse('a,b\n"unterminated\n')).rejects.toBeDefined();
    });
  });

  describe('round trip', () => {
    it('preserves string data through stringify then parse', async () => {
      const rows = [
        { name: 'Dana', note: 'say "hi", politely' },
        { name: 'Sam', note: 'line1\nline2' },
      ];

      const output = await csv.stringify(rows);

      await expect(csv.parse(output)).resolves.toEqual(rows);
    });
  });
});
