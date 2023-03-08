import React from 'react'
import { AiOutlineLeft } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

type HeaderProps = {
  title?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  return <>
    <h2 className="card-title" data-tauri-drag-region><button onClick={() => navigate(-1)}><AiOutlineLeft /></button>{title}</h2>
  </>
}
