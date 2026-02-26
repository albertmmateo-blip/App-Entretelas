import { useEffect } from 'react';
import useCRUD from './useCRUD';

/**
 * Returns live entry counts for nav-bar badges, reusing the shared
 * Zustand stores that useCRUD maintains per module.
 * Issues a fetchAll on mount so counts are available before visiting any page.
 */
export default function useNavCounts() {
  const notas = useCRUD('notas');
  const llamar = useCRUD('llamar');
  const encargar = useCRUD('encargar');

  useEffect(() => {
    notas.fetchAll();
    llamar.fetchAll();
    encargar.fetchAll();
    // We intentionally run only on mount — the module pages will refresh on
    // their own when the user navigates to them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const urgenteCount =
    notas.entries.filter((e) => e.urgente === 1).length +
    llamar.entries.filter((e) => e.urgente === 1).length +
    encargar.entries.filter((e) => e.urgente === 1).length;

  return {
    notas: notas.entries.length,
    llamar: llamar.entries.length,
    encargar: encargar.entries.length,
    urgente: urgenteCount,
  };
}
