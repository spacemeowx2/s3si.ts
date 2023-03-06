import React from 'react'
import { useTranslation } from 'react-i18next'
import { AiOutlineWarning } from 'react-icons/ai'

type ErrorContentProps = {
  error: any
  retry?: () => void
}

export const ErrorContent: React.FC<ErrorContentProps> = ({ error, retry }) => {
  const { t } = useTranslation();

  if (!error) {
    return <></>;
  }

  return <div className='w-full h-full flex justify-center items-center flex-col'>
    <span className='inline-flex items-center'>
      <AiOutlineWarning className='inline-block scale-[2] mr-4 justify-end flex-none' />
      <div className='max-w-full break-all'>
        <div>{t('发生了错误')}{retry && <button className='link link-info ml-1'>{t('重试')}</button>}</div>
        {String(error)}
      </div>
    </span>
  </div>
}
