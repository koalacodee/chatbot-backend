export abstract class ClassifierService {
  abstract classify(
    content: string,
    possibleClasses: string[],
  ): Promise<{ label: string; score: number }[]>;
}
