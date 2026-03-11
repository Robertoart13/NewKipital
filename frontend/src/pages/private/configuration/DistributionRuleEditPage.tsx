import { useParams } from 'react-router-dom';

import { DistributionRuleFormPage } from './DistributionRuleFormPage';

export function DistributionRuleEditPage() {
  const { publicId } = useParams<{ publicId: string }>();

  if (!publicId) {
    return null;
  }

  return <DistributionRuleFormPage mode="edit" publicId={publicId} />;
}
