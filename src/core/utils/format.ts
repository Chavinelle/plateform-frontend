/** « Aujourd'hui », « Hier », « Il y a 3 jours »… */
export function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Aujourd\'hui';
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Il y a 1 mois' : `Il y a ${months} mois`;
}

/** « 40 000 € – 50 000 € », « À partir de … », ou null si aucun salaire n'est indiqué. */
export function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min === null && max === null) return null;

  const fmt = (n: number): string => {
    if (!currency) return n.toLocaleString('fr-FR');
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n.toLocaleString('fr-FR')} ${currency}`;      // code de devise inconnu du navigateur
    }
  };

  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  return min !== null ? `À partir de ${fmt(min)}` : `Jusqu'à ${fmt(max as number)}`;
}

/** « 820 o », « 45 Ko », « 1,2 Mo ». */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
