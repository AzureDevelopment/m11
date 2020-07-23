using System.Text;
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Azure.Storage.Files.Shares;
using Azure;

namespace Company.Function
{
    public static class Test
    {
        [FunctionName("Test")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            string connectionString = "DefaultEndpointsProtocol=https;AccountName=m10l2;AccountKey=jKxmGhpm9FWua8lWReXyt9gft5xConbXInXr8IRQj2Z1lWVL6YIWNl/pmqm3EQkdh7YgJlTRPakW8w2GiSfswg==;EndpointSuffix=core.windows.net";
            string containerName = "test";
            string queueName = "test";
            string shareName = "test";
            string blobName = $"{Guid.NewGuid().ToString()}.json";
            string fileName = $"{Guid.NewGuid().ToString()}.json";

            BlobContainerClient container = new BlobContainerClient(connectionString, containerName);
            BlobClient blob = container.GetBlobClient(blobName);
            Stream uploadStream = new MemoryStream();
            req.Body.CopyTo(uploadStream);
            uploadStream.Position = 0;
            blob.Upload(uploadStream);
            Stream result = (await blob.DownloadAsync()).Value.Content;
            QueueClient queue = new QueueClient(connectionString, queueName);

            Stream messageStream = new MemoryStream();
            req.Body.Position = 0;
            req.Body.CopyTo(messageStream);
            using (StreamReader sr = new StreamReader(messageStream))
            {
                queue.SendMessage(sr.ReadToEnd());
            }

            QueueMessage[] messages = (await queue.ReceiveMessagesAsync()).Value;

            ShareClient share = new ShareClient(connectionString, shareName);
            ShareDirectoryClient directory = share.GetRootDirectoryClient();

            Stream fileStream = new MemoryStream();
            req.Body.Position = 0;
            req.Body.CopyTo(fileStream);
            fileStream.Position = 0;
            ShareFileClient file = directory.GetFileClient(fileName);
            await file.CreateAsync(fileStream.Length);
            file.UploadRange(new HttpRange(0, fileStream.Length), fileStream);
            var downloadedFile = file.Download();

            using (StreamReader sr = new StreamReader(downloadedFile.Value.Content))
            {
                string uploadedFile = await sr.ReadToEndAsync();
                return new OkObjectResult(uploadedFile);
            }
        }
    }
}
