import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../../firebase-applet-config.json';
import { Logger } from '../utils/logger';

const app = getApps().length === 0 
  ? initializeApp({ projectId: config.projectId })
  : getApp();

Logger.info('Firebase', `Firebase Admin initialized successfully with Project ID: ${config.projectId}`);

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, config.firestoreDatabaseId || '(default)');
