import React from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";

export const Home: React.FC = () => {
  const { t } = useTranslation();

  return <>
    <div className='card m-2 h-full'>
      {t('欢迎!')}
      <Link to='/settings' className='btn btn-primary'>{t('配置')}</Link>
    </div>
  </>
}
