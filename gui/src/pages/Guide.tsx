import clsx from 'clsx';
import { Header } from 'components/Header';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type StepState = {
  next: boolean,
  prev: boolean,
}

type Step = {
  title: string,
  element: React.FC<{ onChange: (v: StepState) => void }>,
}

const Steps: React.FC<{ steps: Step[], className?: string }> = ({ className, steps }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [state, setState] = useState({ next: true, prev: true });
  const hasPrev = step > 0;
  const hasNext = step < steps.length - 1;

  const Content = steps[step].element;
  return <div className={`flex flex-col items-center ${className}`}>
    {/* <ul className="steps w-full mb-4">
      {steps.map(({ title }, i) => <li key={i} className={classNames("step", {
        'step-primary': i <= step,
      })}>{title}</li>)}
    </ul> */}
    {Content && <Content onChange={setState} />}
    <div className='mt-4 flex gap-2'>
      <button
        type='button'
        onClick={() => setStep(s => s - 1)}
        className={clsx('btn', {
          'btn-disabled': !hasPrev || !state.prev,
        })}
      >{t('上一步')}</button>
      <button
        type='button'
        onClick={() => setStep(s => s + 1)}
        className={clsx('btn', {
          'btn-disabled': !hasNext || !state.next,
        })}
      >{t('下一步')}</button>
    </div>
  </div>
}

const LoginNintendoAccount: React.FC<{ onChange: (v: StepState) => void }> = ({ onChange }) => {
  const { t } = useTranslation();

  return <div className='my-3'>
    <button
      type='button'
      className='btn'
      onClick={() => onChange({ next: true, prev: true })}
    >{t('点击登录')}</button>
  </div>
}

export const Guide: React.FC = () => {
  const { t } = useTranslation();


  const steps: Step[] = [{
    title: t('登录Nintendo Account'),
    element: LoginNintendoAccount,
  }, {
    title: t('填写stat.ink API密钥'),
    element: () => <></>,
  }, {
    title: t('完成'),
    element: () => <></>,
  }]

  return <div className="full-card">
    <Header title={t('设置向导')} />
    <Steps className='mt-4' steps={steps} />
  </div>
}
