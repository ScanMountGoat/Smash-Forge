﻿#version 330
 
const int MY_ARRAY_SIZE = 200;

in vec3 vPosition;
in vec4 vColor;
in vec3 vNormal;
in vec2 vUV0;
in vec2 vUV1;
in vec2 vUV2;
in vec4 vBone;
in vec4 vWeight;
in vec3 vTangent;
in vec3 vBitangent;

out vec2 f_texcoord0;
out vec2 f_texcoord1;
out vec2 f_texcoord2;
out vec2 f_texcoord3;
out vec3 normal;
out vec4 color;
out vec3 tangent;
out vec3 bitangent;

uniform vec4 gsys_bake_st0;
uniform vec4 gsys_bake_st1;
uniform vec4 SamplerUV1;
uniform mat4 modelview;
uniform mat4 bones[112];
uniform mat4 bonesfixed[112];
uniform int boneList[112];
uniform int RigidSkinning;
uniform mat4 modelLocation;
uniform int NoSkinning;
uniform mat4 TransformNoRig;

//SRT Animation uniforms
uniform vec2 SRT_Scale;
uniform vec2 SRT_Translate;
uniform float SRT_Rotate;


vec3 skinNRM(vec3 nr, ivec4 index)
{
    vec3 nrmPos = vec3(0);

    if(vWeight.x != 0.0) nrmPos = mat3(bones[boneList[index.x]]) * nr * vWeight.x;
    if(vWeight.y != 0.0) nrmPos += mat3(bones[boneList[index.y]]) * nr * vWeight.y;
    if(vWeight.z != 0.0) nrmPos += mat3(bones[boneList[index.z]]) * nr * vWeight.z;
    if(vWeight.w < 1) nrmPos += mat3(bones[boneList[index.w]]) * nr * vWeight.w;

    return nrmPos;
}

vec2 rotateUV(vec2 uv, float rotation)
{
    float mid = 0.5;
    return vec2(
        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
    );
}

void main()
{
    ivec4 index = ivec4(vBone); 

    vec4 objPos = vec4(vPosition.xyz, 1.0);

    vec4 sampler1 = SamplerUV1;
    vec4 sampler2 = gsys_bake_st0;
    vec4 sampler3 = gsys_bake_st1;

    normal = normalize(mat3(modelview) * vNormal);

    if(vBone.x != -1){
        objPos = bones[boneList[index.x]] * vec4(vPosition, 1.0) * vWeight.x;
        objPos += bones[boneList[index.y]] * vec4(vPosition, 1.0) * vWeight.y;
        objPos += bones[boneList[index.z]] * vec4(vPosition, 1.0) * vWeight.z;
        if(vWeight.w < 1)
            objPos += bones[boneList[index.w]] * vec4(vPosition, 1.0) * vWeight.w;
    }

    gl_Position = modelview * vec4(objPos.xyz, 1.0);

    vec3 distance = (objPos.xyz + vec3(5, 5, 5))/2;

	if(vBone.x != -1.0)
		normal = normalize((skinNRM(vNormal.xyz, ivec4(vBone))).xyz);

	if (RigidSkinning == 1){
	    gl_Position = modelview * bonesfixed[boneList[index.x]] * vec4(vPosition, 1.0);
		mat3 normalMatrix = mat3(modelview);
	    normalMatrix = inverse(mat3(bonesfixed[boneList[index.x]]));
	    normalMatrix = transpose(mat3(bonesfixed[boneList[index.x]]));
		normal = normalize(vNormal * normalMatrix);
	}
	if (NoSkinning == 1){
	    gl_Position = modelview * TransformNoRig * vec4(vPosition, 1.0);
		mat3 normalMatrix = mat3(modelview);
	    normalMatrix = inverse(mat3(TransformNoRig));
	    normalMatrix = transpose(mat3(TransformNoRig));
		normal = normalize(vNormal * normalMatrix);
	}

    //gl_TexCoord[0] = vUV0;
    //gl_TexCoord[1] = vUV1;

	if (sampler2.x + sampler2.y != 0) //BOTW has scale values to 0 if unused so set them to 1
        f_texcoord1 = vec2((vUV1 * sampler2.xy) + sampler2.zw);
     else
        f_texcoord1 = vec2((vUV1 * vec2(1)) + sampler2.zw);

    f_texcoord2 = vec2((vUV1 * sampler3.xy) + sampler3.zw);
    f_texcoord3 = vUV2;

	f_texcoord0 = vec2(vUV0);

	//Set SRT values43
	if (SRT_Scale.x + SRT_Scale.y != 0)
	    f_texcoord0 = vec2((vUV0 * SRT_Scale) + SRT_Translate);


	f_texcoord0 = rotateUV(f_texcoord0, SRT_Rotate);

	tangent = vTangent;
	bitangent = vBitangent;


    color = vColor;
}