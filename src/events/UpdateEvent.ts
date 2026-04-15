export interface UpdateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  startDateTime: Date;
  endDateTime: Date;
}