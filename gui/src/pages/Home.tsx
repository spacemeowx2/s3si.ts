import { OpenSplatnet } from 'components/OpenSplatnet';
import { LogPanel, RunPanel } from 'components/RunPanel';
import { STAT_INK } from 'constant';
import React, { Suspense } from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { FallbackComponent } from 'components/ErrorContent';
import { Loading } from 'components/Loading';

export const Home: React.FC = () => {
  const { t } = useTranslation();

  return <ErrorBoundary FallbackComponent={FallbackComponent}>
    <Suspense fallback={<Loading />}>
      <div className='flex p-2 w-full h-full gap-2'>
        <div className='max-w-full h-full md:max-w-sm flex-auto'>
          <div className='flex flex-col gap-2 h-full'>
            <LogPanel className='sm:hidden flex-auto' />
            <RunPanel />
            <Link to='/settings' className='btn'>{t('设置')}</Link>
            <div className='flex gap-2 flex-auto-all'>
              <OpenSplatnet>{t('打开鱿鱼圈3')}</OpenSplatnet>
              <a className='btn w-full' href={STAT_INK} target='_blank' rel='noreferrer'>{t('前往 stat.ink')}</a>
            </div>
          </div>
        </div>
        <LogPanel className='hidden sm:block flex-1' />
      </div>
    </Suspense>
  </ErrorBoundary>
}
