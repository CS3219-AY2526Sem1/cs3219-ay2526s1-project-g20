import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  label = "Password",
  value,
  onChange,
  disabled = false,
  placeholder = "",
  name, 
  required = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
    return (
    <div className="form-group relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className="input pr-10 w-full"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          name={name}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          tabIndex={-1}
        >
          {showPassword ? (<EyeOff size={18} />) : (<Eye size={18} />)}
        </button>
      </div>
    </div>
  );
}