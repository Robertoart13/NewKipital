import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_COMPANY_KEY = 'allow_without_company';

export const AllowWithoutCompany = () => SetMetadata(ALLOW_WITHOUT_COMPANY_KEY, true);
