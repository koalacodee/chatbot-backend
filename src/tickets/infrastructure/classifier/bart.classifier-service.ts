import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ClassifierService } from 'src/tickets/domain/classifier/classifier-service.interface';

interface ClassificationResponse {
  sequence: string;
  labels: string[];
  scores: number[];
}

@Injectable()
export class BartClassifierService extends ClassifierService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async classify(content: string, possibleClasses: string[]) {
    const labelMap = possibleClasses.reduce(
      (acc, val) => {
        acc[val.toLowerCase().replace(/ /g, '_')] = val;
        return acc;
      },
      {} as Record<string, string>,
    );

    const transformedLabels = Object.keys(labelMap); // candidate_labels

    return axios
      .post<ClassificationResponse>(
        this.config.getOrThrow('CLASSIFIER_API_URL'),
        {
          inputs: content,
          parameters: {
            candidate_labels: transformedLabels,
          },
        },
      )
      .then((res) => {
        return res.data.labels.map((label, idx) => ({
          label: labelMap[label] ?? label,
          score: res.data.scores[idx],
        }));
      });
  }
}
