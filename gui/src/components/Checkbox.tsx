import React from 'react'

type CheckboxProps = {
  children?: React.ReactNode
  value?: boolean
  onChange?: (value: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({ value, onChange, children }) => {
  return <div className="form-control">
    <label className="label cursor-pointer">
      <span className="label-text">{children}</span>
      <input type="checkbox" checked={value ?? false} onChange={() => onChange?.(!value)} className="checkbox" />
    </label>
  </div>
}
