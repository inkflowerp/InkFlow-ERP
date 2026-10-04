import { redirect } from 'next/navigation'

export default function PlatformPermissionsRedirect() {
  redirect('/platform/rbac')
}
