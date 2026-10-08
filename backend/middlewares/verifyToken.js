import jwt from 'jsonwebtoken'

export function verifyToken(req,res,next){
    let accessToken=req.cookies.accessToken

    if(accessToken==undefined)
    {
        return res.status(401).json({
            success:false,
            message:"you must login first"
        })
    }
    try{
        let decodedToken=jwt.verify(accessToken,process.env.SECRET_KEY)

        req.user=decodedToken
        next()
    }catch(err)
    {
        return res.status(401).json({success:false,message:"invalid or expired token"})
    }
}