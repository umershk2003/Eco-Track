import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { ScanDocument } from '../types/aiTypes';
import { v4 as uuidv4 } from 'uuid';

export class FirebaseScanService {
    private db = getFirestore();
    private storage = getStorage();

    public async uploadImage(imageBuffer: Buffer, mimetype: string, userId: string): Promise<string> {
        const bucket = this.storage.bucket();
        const filename = `scans/${userId}/${uuidv4()}-${Date.now()}`;
        const file = bucket.file(filename);

        await file.save(imageBuffer, {
            metadata: {
                contentType: mimetype,
            },
        });

        await file.makePublic();
        return file.publicUrl();
    }

    public async saveScan(scanData: ScanDocument): Promise<string> {
        const scanRef = this.db.collection('scans').doc();
        
        await scanRef.set({
            ...scanData,
            id: scanRef.id
        });

        return scanRef.id;
    }
}
