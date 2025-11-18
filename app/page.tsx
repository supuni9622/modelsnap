import { redirect } from 'next/navigation';

export default function RootPage() {
  // Skip env check here - middleware handles it
  // Direct redirect to default locale for faster page load
  redirect('/en');
}
