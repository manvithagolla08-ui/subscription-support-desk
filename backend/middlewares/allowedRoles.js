export function allowedRoles(...roles)
{
    return function(req,res,next)
    {
        if(roles.includes(req.user.role))
        {
            next()
        }
        else{
            res.status(403).json({success:false,message:"you are not authorized to access"})
        }
    }
}