import React from 'react'
import { useTranslation } from 'react-i18next';
import { AiOutlineLeft } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const onSave = async () => {
  }

  return <>
    <div className='card m-2 h-full'>
      <h2 className="card-title text-center w-full"><button onClick={() => navigate('/')}><AiOutlineLeft /></button>{t('配置')}</h2>
      <div className='card'>
        <div className="form-control w-full max-w-xs mb-4">
          <label className="label">
            <span className="label-text">{t('stat.ink API密钥')}</span>
            <span className="label-text-alt"><a
              className='underline'
              target='_blank'
              rel='noopener noreferrer'
              href='https://stat.ink/profile'
              title={t('打开 stat.ink') ?? undefined}
            >{t('stat.ink')}</a></span>
          </label>
          <input type="text" placeholder={t('长度为43') ?? undefined} className="input input-bordered w-full max-w-xs" />
        </div>
      </div>
      <button className='btn btn-primary' onClick={onSave}>{t('保存')}</button>
    </div>
  </>
}