import { Stocks } from "../models/stocks.model.js";
import { TeamDetails } from "../models/teams.model.js";
import { Transactions } from "../models/transactions.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose"


const performTransaction = asyncHandler(async(req,res)=> {
    const {teamId, stockId, numberOfStocks, type} = req.body

    if(teamId == null || stockId == null || numberOfStocks == null || type == null) {
        res.status(400).json(
            new ApiResponse(400, null, "Parameters in body incomplete!")
        )
    }

    let stockDetails = await Stocks.findOne({"_id" : stockId})
    let teamDetails = await TeamDetails.findOne({"teamId" : teamId})

    if(stockDetails.availableStocks <= 0  && type === "buy") {
        res.status(409).json(
            new ApiResponse(409, null, "Insufficient stock available to buy")
        )
    }

    let requestedPrice = stockDetails.sellingPrice * numberOfStocks
    
    if(type === "buy" && teamDetails.currentBalance < requestedPrice) {
        res.status(410).json(
            new ApiResponse(410, null, "Insufficient team balance")
        )
    }

    if(type === "sell") {
        let index = teamDetails.portfolio.find((portfolioDetails) => {
            return String(portfolioDetails.stocks) === stockId
        })
        if(index.numberOfStocks < numberOfStocks) {
            res.status(410).json(
                new ApiResponse(410, null, "Insufficient stocks to sell")
            )
        }
        
    }

    if(type === "buy") {
       let updateBalanceResponse =  await TeamDetails.updateOne(
        {"teamId" : teamId},
        {
            $inc : {"currentBalance" : -requestedPrice}
       }) 

       let updatePortfolioResponse = await TeamDetails.updateOne(
        {"portfolio.stocks": new mongoose.Types.ObjectId(stockId)},
        {$inc: {"portfolio.$.numberOfStocks" : numberOfStocks}
    })

       let updateStockReponse = await Stocks.updateOne(
        {"_id" : stockId},
        {$inc : {"availableStocks" : -numberOfStocks}}
       )


       let stockManipulationResponse = await Stocks.updateOne(
        {"_id" : stockId},
        {$inc : {"valuation" : requestedPrice}}
       )

       let addTransactionResponse = await Transactions.create({
        teamId,
        stockId,
        type,
        numberOfStocks
       })

       if(updateBalanceResponse == null || updatePortfolioResponse == null || updateStockReponse == null || addTransactionResponse == null || stockManipulationResponse == null) {
        res.status(500).json(
            new ApiResponse(500, null, "Error occured during the transaction")
        )
       } else {
        res.status(200).json(
            new ApiResponse(200, {
                "updateBalance" : updateBalanceResponse,
                "updatePortfolio" : updatePortfolioResponse,
                "updateStock" : updateStockReponse,
                "addTransaction"  : addTransactionResponse,
                "stockManipulation" : stockManipulationResponse
            }, "Transaction is successful!")

        )
       }
}

if(type === "sell") {
    let updateBalanceResponse =  await TeamDetails.updateOne(
     {"teamId" : teamId},
     {
         $inc : {"currentBalance" : requestedPrice}
    }) 

    let updatePortfolioResponse = await TeamDetails.updateOne(
     {"portfolio.stocks": new mongoose.Types.ObjectId(stockId)},
     {$inc: {"portfolio.$.numberOfStocks" : -numberOfStocks}
 })

    let updateStockReponse = await Stocks.updateOne(
     {"_id" : stockId},
     {$inc : {"availableStocks" : numberOfStocks}}
    )


    let stockManipulationResponse = await Stocks.updateOne(
     {"_id" : stockId},
     {$inc : {"valuation" : -requestedPrice}}
    )

    let addTransactionResponse = await Transactions.create({
     teamId,
     stockId,
     type,
     numberOfStocks
    })

    if(updateBalanceResponse == null || updatePortfolioResponse == null || updateStockReponse == null || addTransactionResponse == null || stockManipulationResponse == null) {
     res.status(500).json(
         new ApiResponse(500, null, "Error occured during the transaction")
     )
    } else {
     res.status(200).json(
         new ApiResponse(200, {
             "updateBalance" : updateBalanceResponse,
             "updatePortfolio" : updatePortfolioResponse,
             "updateStock" : updateStockReponse,
             "addTransaction"  : addTransactionResponse,
             "stockManipulation" : stockManipulationResponse
         }, "Transaction is successful!")

     )
    }
}

})

export {performTransaction}