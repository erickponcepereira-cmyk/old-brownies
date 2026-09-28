import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import { cx } from '@/lib/cx'
import { plural } from '@/lib/formato'
import { temNuvem, useEstadoSync } from '@/lib/sync/sincronizar'

// B2 — indicador discreto: "tudo salvo" ou "N lançamentos esperando sinal".
export function IndicadorSync() {
  const estado = useEstadoSync()
  const pendentes = useLiveQuery(() => db.outbox.count(), []) ?? 0

  let texto: string
  let cor: string
  if (!temNuvem()) {
    texto = 'salvo no aparelho'
    cor = 'bg-cinza'
  } else if (estado.erro) {
    texto = 'erro ao sincronizar'
    cor = 'bg-vermelho'
  } else if (pendentes === 0) {
    texto = 'tudo salvo'
    cor = 'bg-verde'
  } else if (!estado.online) {
    texto = `${plural(pendentes, 'lançamento', 'lançamentos')} esperando sinal`
    cor = 'bg-ambar'
  } else {
    texto = `enviando ${pendentes}…`
    cor = 'bg-ambar'
  }

  return (
    <Link to="/mais/dados" className="flex min-h-11 items-center gap-2 text-[13px] text-cinza" aria-live="polite">
      <span className={cx('size-2 rounded-full', cor)} aria-hidden />
      {texto}
    </Link>
  )
}
