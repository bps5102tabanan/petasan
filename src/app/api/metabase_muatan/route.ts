import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://metabase.statsbali.id/api/public/dashboard/837a7db1-1690-4812-8ac8-62c65e4f5599/dashcard/75/card/93', {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Metabase data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}