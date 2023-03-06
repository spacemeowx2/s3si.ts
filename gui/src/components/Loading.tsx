import React from 'react'
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

type LoadingProps = {
  className?: string
}

export const Loading: React.FC<LoadingProps> = ({ className }) => {
  return <AiOutlineLoading3Quarters className={`animate-spin my-2 mx-auto ${className}`} />
}
