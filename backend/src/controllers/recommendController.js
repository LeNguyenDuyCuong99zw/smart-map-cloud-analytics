const { db } = require("../config/firebase");
const NaiveBayes = require("../algorithms/NaiveBayes");

const {
    SearchPlaceIndexForTextCommand,
    LocationClient
} = require("@aws-sdk/client-location");

const client = new LocationClient({
    region: process.env.AWS_REGION,
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    }
});

const PLACE_INDEX_NAME = process.env.AWS_PLACE_INDEX_NAME;

async function recommend(req,res){

    try{

        const uid=req.user.uid;

        const snapshot=await db
            .collection("users")
            .doc(uid)
            .collection("history")
            .get();

        const history=snapshot.docs.map(d=>d.data());

        if (history.length === 0) {
    return res.json({
        favoriteCategory: null,
        recommendations: []
    });
}

        const nb=new NaiveBayes();

        const category=nb.predict(history);

        const command=new SearchPlaceIndexForTextCommand({

            IndexName:PLACE_INDEX_NAME,

            Text:category,

            MaxResults:5

        });

        const data=await client.send(command);

        const recommendations=(data.Results||[]).map(r=>{

            const p=r.Place;

            return{

                placeId: p.PlaceId || Math.random().toString(),

name: p.Label ? p.Label.split(",")[0] : "Unknown Place",
                address:p.Label,

                lat:p.Geometry.Point[1],

                lng:p.Geometry.Point[0]

            }

        });

        res.json({

            favoriteCategory:category,

            recommendations

        });

    }

    catch(err){
    console.error(err);

    res.status(500).json({
        error:err.message,
        stack:err.stack
    });
}

}

module.exports={recommend};