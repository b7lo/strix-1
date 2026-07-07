import { useEffect, useState } from "react";

/** يعيد قيمة مؤجّلة تتحدّث بعد توقّف التغيير بمدة delay (افتراضي 350ms). */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
