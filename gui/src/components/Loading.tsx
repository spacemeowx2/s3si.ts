import React from 'react'
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

type LoadingProps = {
}

export const Loading: React.FC<LoadingProps> = ({ }) => {
  return <AiOutlineLoading3Quarters className='animate-spin my-2 mx-auto' />
}
