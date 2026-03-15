import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { User } from "firebase/auth";
import { arrayUnion, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export function usePushRegistration(user: User | null): void {
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const register = async () => {
      const permission = await Notifications.getPermissionsAsync();
      let status = permission.status;

      if (status !== "granted") {
        const request = await Notifications.requestPermissionsAsync();
        status = request.status;
      }

      if (status !== "granted") {
        return;
      }

      const tokenResult = await Notifications.getDevicePushTokenAsync();
      const token = tokenResult.data;
      if (!token) return;

      await setDoc(
        doc(db, "users", user.uid),
        {
          fcmTokens: arrayUnion(token),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    };

    void register();
  }, [user]);
}
