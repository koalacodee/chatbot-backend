export class ProfilePictureUploadedEvent {
  constructor(
    public readonly filename: string,
    public readonly userId: string,
  ) {}
}
