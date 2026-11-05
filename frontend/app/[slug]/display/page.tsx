'use client';

import { use, useEffect, useState } from 'react';
import { HallPickupDisplayBoard } from '@/components/hall/hall-pickup-display';
import { Spinner } from '@/components/ui';
import { usePublicPickupDisplay } from '@/lib/hooks/queries';
import { themeToStyle } from '@/lib/theme/theme-css';

export default function HallPickupDisplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading, isError } = usePublicPickupDisplay(slug);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-PK', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (data?.business?.name) {
      document.title = `${data.business.name} — Order status`;
    }
  }, [data?.business?.name]);

  if (isLoading) {
    return (
      <div className="hall-display hall-display--loading">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="hall-display hall-display--loading">
        <p className="text-lg font-semibold">Unable to load order display.</p>
      </div>
    );
  }

  const themeStyle = themeToStyle({
    primaryColor: data.business.primaryColor,
    secondaryColor: data.business.secondaryColor,
    backgroundColor: data.business.backgroundColor,
    textColor: data.business.textColor,
  });

  return (
    <div style={themeStyle}>
      <HallPickupDisplayBoard
        businessName={data.business.name}
        logoUrl={data.business.logoUrl}
        tickets={data.tickets}
        clock={clock}
      />
    </div>
  );
}
