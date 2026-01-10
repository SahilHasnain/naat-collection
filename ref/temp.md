https://youtu.be/mgONEN7IqE8?si=mkWINU0McOItCV7p
k_007d66f15312.uX4Ng7s0_yKFHUepbs5t6NsNkBa4OjaH_unTppgrNFJhpi6H16rakg

ssh -i "C:\Users\MD SAHIL HASNAIN\Downloads/process-naat_key.pem" azureuser@4.186.24.221

# Upload the Azure GPU script
scp -i "C:\Users\MD SAHIL HASNAIN\Downloads/process-naat_key.pem" scripts\audio-processing\process-naat-audio-azure-gpu.js azureuser@4.186.24.221:~/naat-processing/scripts/audio-processing/

# Upload package.json (for dependencies)
scp -i "C:\Users\MD SAHIL HASNAIN\Downloads/process-naat_key.pem" package.json azureuser@4.186.24.221:~/naat-processing/

# Upload .env file (with your GROQ_API_KEY)
scp -i "C:\Users\MD SAHIL HASNAIN\Downloads/process-naat_key.pem" .env azureuser@4.186.24.221:~/naat-processing/

node scripts/audio-processing/process-naat-audio-azure-gpu.js https://youtu.be/mgONEN7IqE8


No LSB modules are available.
Distributor ID: Ubuntu
Description:    Ubuntu 24.04.3 LTS
Release:        24.04
Codename:       noble
azureuser@process-naat:~$ uname -r
6.14.0-1017-azure
azureuser@process-naat:~$

