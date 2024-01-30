import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useLog } from 'services/s3si';
import { Checkbox } from './Checkbox';
import { Loading } from './Loading';
import { useService } from 'services/useService';
import { useAppContext } from 'context/app'

type RunPanelProps = Record<string, never>

export const RunPanel: React.FC<RunPanelProps> = () => {
  const { t } = useTranslation();
  const { data: result } = useService('profile', 0)
  const [exportBattle, setExportBattle] = useState(true);
  const [exportCoop, setExportCoop] = useState(true);
  const { exports } = useAppContext()
  const disabled = !exports
  const isExporting = exports?.isExporting ?? false

  if (!result) {
    return <Loading />
  }

  return <>
    <div className="tooltip" data-tip={disabled ? t('请先在设置中完成Nintendo Account登录和stat.ink的API密钥') : undefined}>
      <Checkbox disabled={disabled || isExporting} value={exportBattle} onChange={setExportBattle}>{t('导出对战数据')}</Checkbox>
      <Checkbox disabled={disabled || isExporting} value={exportCoop} onChange={setExportCoop}>{t('导出打工数据')}</Checkbox>
      <button
        type='button'
        onClick={() => exports?.trigger({ exportBattle, exportCoop })}
        className={clsx('btn btn-primary w-full', {
          'btn-disabled': disabled || (!exportBattle && !exportCoop),
        })}
        disabled={isExporting}
      >{isExporting ? <span className='loading' /> : t('导出')}</button>
    </div>
  </>
}

export type LogPanelProps = {
  className?: string
}

export const LogPanel: React.FC<LogPanelProps> = ({ className }) => {
  const { renderedLogs } = useLog();
  const div = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (div.current) {
      div.current.scrollTop = div.current.scrollHeight;
    }
  }, [renderedLogs])

  return <div ref={div} className={`bg-neutral text-neutral-content overflow-auto rounded p-4 ${className}`}>
    {renderedLogs.length === 0 && <pre><code>{t('欢迎! 请点击"导出"按钮开始使用.')}</code></pre>}
    {renderedLogs.map((line, i) => <pre key={i}><code>{line}</code></pre>)}
  </div>
}
