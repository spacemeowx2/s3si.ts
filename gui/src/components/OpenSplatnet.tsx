import { invoke } from '@tauri-apps/api';
import clsx from 'clsx';
import { useService, useServiceMutation } from 'services/useService';
import React, { useState } from 'react'
import { ensureTokenValid } from 'services/s3si';
import { ErrorContent } from './ErrorContent';

type OpenSplatnetProps = {
  children?: React.ReactNode
}

export const OpenSplatnet: React.FC<OpenSplatnetProps> = ({ children }) => {
  const profileResult = useService('profile', 0)
  const { trigger: setProfile } = useServiceMutation('profile', 0)

  const [doing, setDoing] = useState(false);
  const [err, setError] = useState<unknown>();

  const onClick = async () => {
    setDoing(true);
    try {
      if (!profileResult.data) {
        return;
      }
      const state = profileResult.data.state;
      const newState = await ensureTokenValid(state);
      await setProfile({
        ...profileResult.data,
        state: newState,
      });

      const gtoken = newState.loginState?.gToken;
      await invoke('open_splatnet', {
        gtoken,
        lang: profileResult.data.state.userLang,
      });
    } catch (e) {
      setError(e);
    } finally {
      setDoing(false);
    }
  };


  if (err) {
    return <>
      <ErrorContent error={err} />
    </>
  }

  const btnLoading = profileResult.isLoading || doing;
  return <>
    <button
      type='button'
      className={clsx('btn w-full', {
        'btn-disabled': !profileResult.data?.state?.loginState?.sessionToken,
      })}
      onClick={onClick}
      disabled={btnLoading}
    >{btnLoading ? <span className='loading' /> : children}</button>
  </>
}
