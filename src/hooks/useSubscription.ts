import { useState, useEffect } from 'react';
import { checkSubscriptionStatus } from '../lib/api';

export const useSubscription = (authorId: string | null, userId: string | null) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
      if (!authorId || !userId || authorId === userId) {
        if (isMounted) {
          setIsSubscribed(false);
          setSubscriptionId(null);
          setLoading(false);
        }
        return;
      }

      try {
        const subscription = await checkSubscriptionStatus(authorId, userId);
        if (isMounted) {
          setIsSubscribed(!!subscription);
          setSubscriptionId(subscription?.$id || null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (isMounted) {
          setIsSubscribed(false);
          setSubscriptionId(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [authorId, userId]);

  return { isSubscribed, subscriptionId, loading, setIsSubscribed, setSubscriptionId };
};