import classNames from 'classnames';
import { usePromise } from 'hooks/usePromise';
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { canExport, getProfile, setProfile } from 'services/config';
import { run } from 'services/s3si';
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

  return <>
    <Checkbox value={exportBattle} onChange={setExportBattle}>{t('导出对战数据')}</Checkbox>
    <Checkbox value={exportCoop} onChange={setExportCoop}>{t('导出打工数据')}</Checkbox>
    <button
      onClick={onClick}
      className={classNames('btn', {
        'btn-disabled': !canExport(result) || (!exportBattle && !exportCoop),
        'loading': loading,
      })}
    >{t('导出')}</button>
  </>
}
