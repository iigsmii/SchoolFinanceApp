import { useCallback, useEffect, useState } from 'react';
import { ClaimSettlement } from '../types';
import { apiClaimSettlements } from '../services/googleSheets';

/** سابقه‌ی تسویه‌ی طلب مدیران از سرور (برای مدیر ارشد همه، برای مدیر فقط موارد خودش). */
export function useClaimSettlements(enabled: boolean = true) {
  const [settlements, setSettlements] = useState<ClaimSettlement[]>([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await apiClaimSettlements();
      if (data) {
        setSettlements(data);
        setError('');
      } else {
        setError('دریافت سابقه تسویه‌ها ممکن نشد.');
      }
    } catch {
      setError('دریافت سابقه تسویه‌ها ممکن نشد.');
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { settlements, error, reload };
}
