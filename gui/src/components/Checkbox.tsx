import React from 'react'

type CheckboxProps = {
  disabled?: boolean
  children?: React.ReactNode
  value?: boolean
  onChange?: (value: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({ disabled, value, onChange, children }) => {
  return <div className="form-control">
    <label className="label cursor-pointer">
      <span className="label-text">{children}</span>
      <input type="checkbox" checked={value ?? false} disabled={disabled} onChange={() => onChange?.(!value)} className="checkbox" />
    </label>
  </div>
}
