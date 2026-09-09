import { redirect } from 'next/navigation'

export default function PlatformEmailRedirect() {
  redirect('/platform/settings/communication')
}
