import exp from "express"
import {incidentModel} from "../models/incidentModel.js"

export const statusRouter = exp.Router()

// Get current incident status
statusRouter.get("/status",async(req,res)=>{
    try{
        const incidents = await incidentModel.find(
            {},
            {
                _id:0,
                feature:1,
                title:1,
                description:1,
                status:1
            }
        ).sort({createdAt:-1})

        res.status(200).json({
            success:true,
            data:incidents
        })

    }catch(error){
        console.error("Error fetching incident status:",error)

        res.status(500).json({
            success:false,
            message:"Unable to fetch incident status"
        })
    }
})