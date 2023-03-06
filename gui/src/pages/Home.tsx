import { ErrorContent } from 'components/ErrorContent';
import { Loading } from 'components/Loading';
import { usePromise } from 'hooks/usePromise';
import React from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { getConfig, getProfile } from 'services/config';
import { composeLoadable } from 'utils/composeLoadable';

export const Home: React.FC = () => {
  let { loading, error, retry, result } = composeLoadable({
    config: usePromise(getConfig),
    profile: usePromise(() => getProfile(0)),
  });
  const { t } = useTranslation();

  if (loading) {
    return <>
      <div className='h-full flex items-center justify-center'><Loading /></div>
    </>
  }

  if (error) {
    return <>
      <ErrorContent error={error} retry={retry} />
    </>
  }

  return <>
    <div className='card m-2 h-full'>
      {t('欢迎!')}
      <Link to='/settings' className='btn btn-primary'>{t('配置')}</Link>
    </div>
  </>
}
