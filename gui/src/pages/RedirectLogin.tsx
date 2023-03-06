import { Loading } from 'components/Loading';
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-use';

export const RedirectLogin: React.FC = () => {
  const { t } = useTranslation();
  const state = useLocation();

  useEffect(() => {
    const search = state.search ?? '';

    const index = search.indexOf('url=');
    if (index === -1) {
      return;
    }
    const url = decodeURIComponent(search.substring(index + 4));

    window.location.href = url;
  }, [state])

  return <div className='h-full flex justify-center items-center'>
    <span className='flex justify-center items-center gap-1'><Loading className='align-middle' />{t('正在跳转到登录页面...')}</span>
  </div>
}
