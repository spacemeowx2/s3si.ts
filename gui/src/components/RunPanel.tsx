import classNames from 'classnames';
import { usePromise } from 'hooks/usePromise';
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { canExport, getProfile, setProfile } from 'services/config';
import { run, useLog } from 'services/s3si';
import { Checkbox } from './Checkbox';
import { Loading } from './Loading';

type RunPanelProps = {
}

export const RunPanel: React.FC<RunPanelProps> = () => {
  const { t } = useTranslation();
  const { result } = usePromise(() => getProfile(0));
  const [exportBattle, setExportBattle] = useState(true);
  const [exportCoop, setExportCoop] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!result) {
    return <Loading />
  }

  const onClick = async () => {
    setLoading(true);
    try {
      const { state } = result;
      const newState = await run(state, {
        exporter: "stat.ink,file",
        monitor: false,
        withSummary: false,
        skipMode: exportBattle === false ? 'vs' : exportCoop === false ? 'coop' : undefined,
      });
      await setProfile(0, {
        ...result,
        state: newState,
      })
    } finally {
      setLoading(false);
    }
  }
  const disabled = !canExport(result);

  return <>
    <div className="tooltip" data-tip={disabled ? t('请先完成登录和stat.ink的API密钥设置') : undefined}>
      <Checkbox disabled={disabled || loading} value={exportBattle} onChange={setExportBattle}>{t('导出对战数据')}</Checkbox>
      <Checkbox disabled={disabled || loading} value={exportCoop} onChange={setExportCoop}>{t('导出打工数据')}</Checkbox>
      <button
        onClick={onClick}
        className={classNames('btn w-full', {
          'btn-disabled': disabled || (!exportBattle && !exportCoop),
          'loading': loading,
        })}
      >{t('导出')}</button>
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

  return <div ref={div} className={`bg-neutral overflow-auto rounded p-4 ${className}`}>
    {renderedLogs.length === 0 && <pre><code>{t('欢迎! 请点击"导出"按钮开始使用.')}</code></pre>}
    {renderedLogs.map((line, i) => <pre key={i}><code>{line}</code></pre>)}
  </div>
}
