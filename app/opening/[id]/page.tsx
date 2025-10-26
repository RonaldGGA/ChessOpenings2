"use client"
import { useParams } from 'next/navigation'
import React from 'react'

const OpeningInfo = () => {
    const {id} = useParams()
  return (
    <div>
        {/*Dinamic Page intented to change the content according to the selected opening*/}
        {/*Its just an option, maybe it is more effective to create many pages with all the info of the openings*/}

    </div>
  )
}

export default OpeningInfo