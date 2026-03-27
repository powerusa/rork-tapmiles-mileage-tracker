import { TripPurpose } from '@/types/trip';
import { Colors } from '@/constants/colors';

export interface PurposeOption {
  key: TripPurpose;
  label: string;
  icon: string;
  color: string;
}

export const PURPOSE_OPTIONS: PurposeOption[] = [
  { key: 'business', label: 'Business', icon: 'briefcase', color: Colors.purposes.business },
  { key: 'personal', label: 'Personal', icon: 'user', color: Colors.purposes.personal },
  { key: 'medical', label: 'Medical', icon: 'heart-pulse', color: Colors.purposes.medical },
  { key: 'charity', label: 'Charity', icon: 'hand-heart', color: Colors.purposes.charity },
];
