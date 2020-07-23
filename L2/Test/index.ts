import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { Guid } from 'guid-typescript';

import {
    QueueServiceClient,
    StorageSharedKeyCredential as QueueStorageSharedKeyCredential,
} from '@azure/storage-queue';
import {
    BlobServiceClient,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    SASProtocol,
    StorageSharedKeyCredential as BlobStorageSharedKeyCredential,
} from '@azure/storage-blob';
import {
    ShareServiceClient,
    StorageSharedKeyCredential as FileStorageSharedKeyCredential,
} from '@azure/storage-file-share';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    const accountName = process.env.account_name;
    const accountKey = process.env.account_key;
    const getAccountUrl = (serviceType: 'blob' | 'queue' | 'file') =>
        `https://${accountName}.${serviceType}.core.windows.net`;
    const queueCredentials = new QueueStorageSharedKeyCredential(
        accountName,
        accountKey
    );
    const blobCredentials = new BlobStorageSharedKeyCredential(
        accountName,
        accountKey
    );
    const fileCredentials = new FileStorageSharedKeyCredential(
        accountName,
        accountKey
    );

    const blobServiceClient = new BlobServiceClient(
        getAccountUrl('blob'),
        blobCredentials
    );
    const queueServiceClient = new QueueServiceClient(
        getAccountUrl('queue'),
        queueCredentials
    );
    const fileServiceClient = new ShareServiceClient(
        getAccountUrl('file'),
        fileCredentials
    );

    const blobName = `${Guid.create().toString()}.json`;
    const containerClient = blobServiceClient.getContainerClient('test');
    const bodyBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
    await containerClient.uploadBlockBlob(
        blobName,
        bodyBuffer,
        bodyBuffer.length
    );

    const blobClient = containerClient
        .getBlobClient(blobName)
        .getBlockBlobClient();
    const downloadedBuffer = await blobClient.downloadToBuffer();
    const blob = downloadedBuffer.toString('utf-8');

    const queueClient = queueServiceClient.getQueueClient('test');
    await queueClient.sendMessage(JSON.stringify(req.body));
    const messages = (await queueClient.receiveMessages()).receivedMessageItems; // no built-in event listeners, just polling / azure functions

    const fileName = `${Guid.create().toString()}.json`;
    const fileBuffer = Buffer.from(JSON.stringify(req.body), 'utf-8');
    const fileClient = fileServiceClient.getShareClient('test');
    const fileShare = await fileClient.rootDirectoryClient.createFile(
        fileName,
        fileBuffer.length
    );
    await fileShare.fileClient.uploadData(fileBuffer);
    const downloadedFile = await fileClient.rootDirectoryClient
        .getFileClient(fileName)
        .downloadToBuffer();

    context.res = {
        body: JSON.parse(downloadedFile.toString('utf-8')),
    };
};

export default httpTrigger;
