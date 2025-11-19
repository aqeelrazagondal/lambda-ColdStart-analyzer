"use client";
import { useParams } from 'next/navigation';
import { OrgDataProvider } from '../../providers/OrgDataContext';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as string;

  if (!orgId) {
    return <>{children}</>;
  }

  return <OrgDataProvider orgId={orgId}>{children}</OrgDataProvider>;
}
