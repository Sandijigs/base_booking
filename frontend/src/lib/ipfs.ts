export async function uploadImageToIPFS(file: File): Promise<string> {
  try {
    console.log('Uploading to IPFS via Pinata...', file.name)
    
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB')
    }

    // Create form data for upload
    const formData = new FormData()
    formData.append('file', file)

    // Upload to Pinata using their REST API
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Pinata upload failed: ${error.error || 'Unknown error'}`)
    }

    const data = await response.json()
    
    // Construct IPFS URL using Pinata gateway
    const ipfsUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${data.IpfsHash}`
    
    console.log('✅ Upload successful:', ipfsUrl)
    console.log('IPFS Hash:', data.IpfsHash)
    
    return ipfsUrl
  } catch (error) {
    console.error("IPFS upload error:", error)
    throw error
  }
}

export async function uploadJSONToIPFS(data: object): Promise<string> {
  try {
    console.log('Uploading JSON metadata to IPFS...')
    
    // Upload JSON to Pinata using their REST API
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pinataContent: data
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Pinata JSON upload failed: ${error.error || 'Unknown error'}`)
    }

    const result = await response.json()
    const ipfsUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${result.IpfsHash}`
    
    console.log('✅ JSON upload successful:', ipfsUrl)
    return ipfsUrl
  } catch (error) {
    console.error("IPFS JSON upload error:", error)
    throw error
  }
}
