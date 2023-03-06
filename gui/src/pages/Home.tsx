import React from 'react'
import { useTranslation } from 'react-i18next';

export const Home: React.FC = () => {
  const { t } = useTranslation();

  return <>
    <div className='card m-2 h-full'>
      {t('欢迎!')}
      <a href='/settings' className='btn btn-primary'>{t('配置')}</a>
    </div>
  </>
}
