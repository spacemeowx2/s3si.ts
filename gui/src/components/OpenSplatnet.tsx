import { invoke } from '@tauri-apps/api';
import classNames from 'classnames';
import { usePromise } from 'hooks/usePromise';
import React, { useState } from 'react'
import { getConfig, getProfile, setProfile } from 'services/config';
import { ensureTokenValid } from 'services/s3si';
import { composeLoadable } from 'utils/composeLoadable';
import { ErrorContent } from './ErrorContent';

type OpenSplatnetProps = {
  children?: React.ReactNode
}

export const OpenSplatnet: React.FC<OpenSplatnetProps> = ({ children }) => {
  let { loading, error, retry, result } = composeLoadable({
    config: usePromise(getConfig),
    profile: usePromise(() => getProfile(0)),
  });
  const [doing, setDoing] = useState(false);
  const [err, setError] = useState<any>();

  const onClick = async () => {
    setDoing(true);
    try {
      if (!result) {
        return;
      }
      const state = result.profile.state;
      const newState = await ensureTokenValid(state);
      await setProfile(0, {
        ...result.profile,
        state: newState,
      });
      retry?.();
      const gtoken = newState.loginState?.gToken;
      await invoke('open_splatnet', {
        gtoken,
        lang: result.profile.state.userLang,
      });
    } catch (e) {
      setError(e);
    } finally {
      setDoing(false);
    }
  };


  if (error || err) {
    return <>
      <ErrorContent error={error || err} retry={retry} />
    </>
  }

  const btnLoading = loading || doing;
  return <>
    <button className={classNames('btn w-full', {
      'btn-disabled': !result?.profile.state.loginState?.sessionToken,
    })} onClick={onClick} disabled={btnLoading}>{btnLoading ? <span className='loading' /> : children}</button>
  </>
}
