package com.hdtpt.pentachat.wallet.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RedeemCardRequest {
    private String provider;
    private Long amount;
    private Integer gemCost;
}